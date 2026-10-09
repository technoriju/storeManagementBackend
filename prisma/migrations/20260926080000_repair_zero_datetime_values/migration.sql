UPDATE `Brand`
SET `updatedAt` = CASE
  WHEN `createdAt` IS NULL OR YEAR(`createdAt`) = 0 THEN CURRENT_TIMESTAMP(3)
  ELSE `createdAt`
END
WHERE YEAR(`updatedAt`) = 0;

UPDATE `TaxRate`
SET `updatedAt` = CASE
  WHEN `createdAt` IS NULL OR YEAR(`createdAt`) = 0 THEN CURRENT_TIMESTAMP(3)
  ELSE `createdAt`
END
WHERE YEAR(`updatedAt`) = 0;
