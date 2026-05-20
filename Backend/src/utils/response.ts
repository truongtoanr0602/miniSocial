import type { Request, Response } from "express";

export const successResponse = (
  req: Request,
  res: Response,
  data: any = null,
  messageKey = "common.SUCCESS",
  status = 200,
  meta: any = null,
  params: Record<string, any> = {} // 👈 Thêm tham số động cho Success
) => {
  const t = (req as any).t;
  
  // 1. Đổi const thành let để có thể ghi đè biến
  let translatedMessage = t ? t(messageKey) : messageKey;

  // 2. ⚡️ Quét và thay thế biến {tên_biến}
  if (params && Object.keys(params).length > 0) {
    for (const [key, value] of Object.entries(params)) {
      translatedMessage = translatedMessage.replace(
        new RegExp(`\\{\\{?${key}\\}?\\}`, 'g'), 
        String(value)
      );
    }
  }

  return res.status(status).json({
    success: true,
    message: translatedMessage,
    data,
    ...(meta && { meta }),
  });
};

export const errorResponse = (
  req: Request,
  res: Response,
  messageKey = "common.SERVER_ERROR",
  status = 500,
  error = "SERVER_ERROR",
  params: Record<string, any> = {} // 👈 Thêm tham số động cho Error
) => {
  const t = (req as any).t;
  
  // 1. Đổi const thành let để có thể ghi đè biến
  let translatedMessage = t ? t(messageKey) : messageKey;

  // 2. ⚡️ Quét và thay thế biến {tên_biến}
  if (params && Object.keys(params).length > 0) {
    for (const [key, value] of Object.entries(params)) {
      translatedMessage = translatedMessage.replace(
        new RegExp(`\\{\\{?${key}\\}?\\}`, 'g'), 
        String(value)
      );
    }
  }

  return res.status(status).json({
    success: false,
    message: translatedMessage, 
    error,
    ...(Object.keys(params).length > 0 && { details: params }) // Đính kèm chi tiết lỗi nếu có
  });
};