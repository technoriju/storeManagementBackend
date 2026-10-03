import { AllExceptionsFilter } from "./all-exceptions.filter";
import { BadRequestException, UnauthorizedException, HttpException, HttpStatus } from "@nestjs/common";

describe("AllExceptionsFilter", () => {
  let filter: AllExceptionsFilter;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
  });

  it("should format ValidationPipe bad request array into message and errors", () => {
    const mockJson = jest.fn();
    const mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    const mockHost = {
      switchToHttp: () => ({
        getResponse: () => ({ status: mockStatus }),
        getRequest: () => ({ url: "/api/v1/sales", method: "POST" }),
      }),
    } as any;

    const exception = new BadRequestException([
      "items.0.productId must be a valid numeric ID",
      "items.1.productId must be a valid numeric ID",
    ]);

    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        path: "/api/v1/sales",
        message: "Bad Request",
        errors: [
          "items.0.productId must be a valid numeric ID",
          "items.1.productId must be a valid numeric ID",
        ],
        data: null,
      }),
    );
  });

  it("should handle single validation error message", () => {
    const mockJson = jest.fn();
    const mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    const mockHost = {
      switchToHttp: () => ({
        getResponse: () => ({ status: mockStatus }),
        getRequest: () => ({ url: "/api/v1/sales", method: "POST" }),
      }),
    } as any;

    const exception = new BadRequestException([
      "items.0.productId must be a valid numeric ID",
    ]);

    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: "items.0.productId must be a valid numeric ID",
        errors: ["items.0.productId must be a valid numeric ID"],
      }),
    );
  });

  it("should handle 401 UnauthorizedException with proper message", () => {
    const mockJson = jest.fn();
    const mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    const mockHost = {
      switchToHttp: () => ({
        getResponse: () => ({ status: mockStatus }),
        getRequest: () => ({ url: "/api/v1/sales", method: "GET" }),
      }),
    } as any;

    const exception = new UnauthorizedException("jwt expired");

    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(401);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        message: "jwt expired",
        data: null,
      }),
    );
  });
});
