import { Router } from "express";
import { validateRequest } from "zod-express-middleware";
import { prisma } from "../../prisma/db.setup";
import { z } from "zod";
import crypto from "crypto";
import { encryptPassword } from "../utils/auth-utils";

const authRouter = Router();

// Password reset request endpoint
authRouter.post(
  "/password-reset-request",
  validateRequest({
    body: z.object({
      email: z.string().email(),
    }),
  }),
  async (req, res) => {
    const { email } = req.body;

    try {
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email },
      });

      // Always return success message for security (don't reveal if email exists)
      if (!user) {
        return res.status(200).json({
          message: "If the email exists, a password reset link has been sent.",
        });
      }

      // Generate secure random token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

      // Clean up any existing unused tokens for this user
      await prisma.passwordResetToken.deleteMany({
        where: {
          user_id: user.user_id,
          used: false,
        },
      });

      // Create new reset token
      await prisma.passwordResetToken.create({
        data: {
          token: resetToken,
          user_id: user.user_id,
          expiresAt,
        },
      });

      // TODO: Send email with reset link
      // For now, we'll just log the token (in production, send email)
      console.log(`Password reset token for ${email}: ${resetToken}`);
      console.log(`Reset link: http://localhost:3000/reset-password?token=${resetToken}`);

      return res.status(200).json({
        message: "If the email exists, a password reset link has been sent.",
      });
    } catch (error) {
      console.error("Password reset request error:", error);
      return res.status(500).json({
        error: "An error occurred while processing your request. Please try again.",
      });
    }
  }
);

// Password reset confirm endpoint
authRouter.post(
  "/password-reset-confirm",
  validateRequest({
    body: z.object({
      token: z.string(),
      newPassword: z.string().min(6),
    }),
  }),
  async (req, res) => {
    const { token, newPassword } = req.body;

    try {
      // Find valid reset token
      const resetToken = await prisma.passwordResetToken.findUnique({
        where: { token },
        include: { user: true },
      });

      if (!resetToken) {
        return res.status(400).json({
          error: "Invalid or expired reset token.",
        });
      }

      // Check if token is expired
      if (new Date() > resetToken.expiresAt) {
        return res.status(400).json({
          error: "Reset token has expired. Please request a new one.",
        });
      }

      // Check if token is already used
      if (resetToken.used) {
        return res.status(400).json({
          error: "Reset token has already been used.",
        });
      }

      // Hash new password
      const hashedPassword = await encryptPassword(newPassword);

      // Update user password and mark token as used in a transaction
      await prisma.$transaction([
        prisma.user.update({
          where: { user_id: resetToken.user_id },
          data: { hashedPassword },
        }),
        prisma.passwordResetToken.update({
          where: { id: resetToken.id },
          data: { used: true },
        }),
      ]);

      return res.status(200).json({
        message: "Password has been reset successfully.",
      });
    } catch (error) {
      console.error("Password reset confirm error:", error);
      return res.status(500).json({
        error: "An error occurred while resetting your password. Please try again.",
      });
    }
  }
);

export { authRouter };