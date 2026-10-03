import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = "Internal server error";
    let errors: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === "string") {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === "object" && exceptionResponse !== null) {
        const resp = exceptionResponse as any;
        if (Array.isArray(resp.message)) {
          // ValidationPipe error array
          errors = resp.message;
          message =
            resp.message.length === 1
              ? resp.message[0]
              : resp.error || "Validation failed";
        } else {
          message = resp.message || exception.message;
          if (resp.errors) {
            errors = resp.errors;
          }
        }
      }
    }

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(`Status: ${status} Error: ${JSON.stringify(message)}`);
      if (exception instanceof Error) {
        this.logger.error(exception.stack);
      }
    } else {
      this.logger.warn(
        `Status: ${status} [${request.method} ${request.url}] Error: ${JSON.stringify(errors || message)}`,
      );
    }

    const responsePayload: Record<string, any> = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: message,
      data: null,
    };

    if (errors) {
      responsePayload.errors = errors;
    }

    response.status(status).json(responsePayload);
  }
}
