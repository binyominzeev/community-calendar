import { parseGregorianDateString, parseHebrewDateString, gregorianToHebrew } from "../hebcal";

describe("Import date parsing", () => {
  describe("parseGregorianDateString", () => {
    it("should parse valid YYYY-MM-DD dates", () => {
      const result = parseGregorianDateString("2000-01-15");
      expect(result).toEqual({ day: 15, month: 1, year: 2000 });
    });

    it("should parse December dates", () => {
      const result = parseGregorianDateString("2024-12-25");
      expect(result).toEqual({ day: 25, month: 12, year: 2024 });
    });

    it("should handle leap year February 29", () => {
      const result = parseGregorianDateString("2000-02-29");
      expect(result).toEqual({ day: 29, month: 2, year: 2000 });
    });

    it("should reject invalid month", () => {
      const result = parseGregorianDateString("2000-13-01");
      expect(result).toBeNull();
    });

    it("should reject invalid day", () => {
      const result = parseGregorianDateString("2000-01-32");
      expect(result).toBeNull();
    });

    it("should reject wrong format", () => {
      const result = parseGregorianDateString("2000/01/15");
      expect(result).toBeNull();
    });

    it("should reject Feb 30", () => {
      const result = parseGregorianDateString("2000-02-30");
      expect(result).toBeNull();
    });
  });

  describe("parseHebrewDateString", () => {
    it("should parse Hebrew dates like '7 Tishrei'", () => {
      const result = parseHebrewDateString("7 Tishrei");
      expect(result).toEqual({ day: 7, month: 7 });
    });

    it("should parse 'Iyyar' variant", () => {
      const result = parseHebrewDateString("24 Iyyar");
      expect(result).toEqual({ day: 24, month: 2 });
    });

    it("should parse 'Iyar' variant", () => {
      const result = parseHebrewDateString("24 Iyar");
      expect(result).toEqual({ day: 24, month: 2 });
    });

    it("should reject missing month", () => {
      const result = parseHebrewDateString("7");
      expect(result).toBeNull();
    });

    it("should reject missing day", () => {
      const result = parseHebrewDateString("Tishrei");
      expect(result).toBeNull();
    });

    it("should reject invalid month name", () => {
      const result = parseHebrewDateString("7 InvalidMonth");
      expect(result).toBeNull();
    });
  });

  describe("gregorianToHebrew conversion", () => {
    it("should convert Gregorian date to Hebrew date", () => {
      const date = new Date(2000, 0, 15); // Jan 15, 2000
      const result = gregorianToHebrew(date);
      expect(result).toHaveProperty("day");
      expect(result).toHaveProperty("month");
      expect(result).toHaveProperty("year");
      expect(result.day).toBeGreaterThan(0);
      expect(result.month).toBeGreaterThan(0);
      expect(result.month).toBeLessThanOrEqual(13);
    });
  });
});
