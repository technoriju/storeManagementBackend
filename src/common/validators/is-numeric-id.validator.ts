import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from "class-validator";

/**
 * Validates that a value is a valid numeric ID (positive integer or positive numeric string).
 * Handles BigInt IDs sent as strings (e.g. from Flutter/Drift or JSON BigInt serialization) or numbers.
 */
export function IsNumericId(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: "isNumericId",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (value === null || value === undefined) return false;
          if (typeof value === "number") {
            return Number.isInteger(value) && value > 0;
          }
          if (typeof value === "string") {
            const trimmed = value.trim();
            if (!/^\d+$/.test(trimmed)) return false;
            try {
              return BigInt(trimmed) > 0n;
            } catch {
              return false;
            }
          }
          if (typeof value === "bigint") {
            return value > 0n;
          }
          return false;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid numeric ID (integer or numeric string)`;
        },
      },
    });
  };
}
