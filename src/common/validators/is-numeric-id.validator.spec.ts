import { validate } from "class-validator";
import { IsNumericId } from "./is-numeric-id.validator";

class TestDto {
  @IsNumericId()
  id: string | number;
}

describe("IsNumericId Validator", () => {
  it("should validate positive integer numbers", async () => {
    const dto = new TestDto();
    dto.id = 123;
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it("should validate positive integer numeric strings", async () => {
    const dto = new TestDto();
    dto.id = "456";
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it("should fail on non-numeric strings", async () => {
    const dto = new TestDto();
    dto.id = "abc";
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints?.isNumericId).toContain("must be a valid numeric ID");
  });

  it("should fail on 0 or negative numbers", async () => {
    const dto1 = new TestDto();
    dto1.id = 0;
    const errors1 = await validate(dto1);
    expect(errors1.length).toBeGreaterThan(0);

    const dto2 = new TestDto();
    dto2.id = -5;
    const errors2 = await validate(dto2);
    expect(errors2.length).toBeGreaterThan(0);
  });

  it("should fail on null or undefined", async () => {
    const dto = new TestDto();
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
