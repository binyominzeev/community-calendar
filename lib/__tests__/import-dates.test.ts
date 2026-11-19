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
    it("should parse Hebrew dates like '7 Tishrei' (English format)", () => {
      const result = parseHebrewDateString("7 Tishrei");
      expect(result).toEqual({ day: 7, month: 7 });
    });

    it("should parse Hungarian format 'Tishrei 7' (Month day)", () => {
      const result = parseHebrewDateString("Tishrei 7");
      expect(result).toEqual({ day: 7, month: 7 });
    });

    it("should parse Hungarian accented format 'Niszán 14'", () => {
      const result = parseHebrewDateString("Niszán 14");
      expect(result).toEqual({ day: 14, month: 1 });
    });

    it("should parse 'Ádár (I) 22' format", () => {
      const result = parseHebrewDateString("Ádár (I) 22");
      expect(result).toEqual({ day: 22, month: 12 });
    });

    it("should parse 'Ádár (II) 14' format", () => {
      const result = parseHebrewDateString("Ádár (II) 14");
      expect(result).toEqual({ day: 14, month: 13 });
    });

    it("should parse 'Ádár 17' format", () => {
      const result = parseHebrewDateString("Ádár 17");
      expect(result).toEqual({ day: 17, month: 12 });
    });

    it("should parse 'Chesván 13' format (Hungarian accented)", () => {
      const result = parseHebrewDateString("Chesván 13");
      expect(result).toEqual({ day: 13, month: 8 });
    });

    it("should parse 'Ijár 27' format", () => {
      const result = parseHebrewDateString("Ijár 27");
      expect(result).toEqual({ day: 27, month: 2 });
    });

    it("should parse 'Svát 24' format", () => {
      const result = parseHebrewDateString("Svát 24");
      expect(result).toEqual({ day: 24, month: 11 });
    });

    it("should parse 'Sziván 15' format", () => {
      const result = parseHebrewDateString("Sziván 15");
      expect(result).toEqual({ day: 15, month: 3 });
    });

    it("should parse 'Támuz 2' format", () => {
      const result = parseHebrewDateString("Támuz 2");
      expect(result).toEqual({ day: 2, month: 4 });
    });

    it("should parse 'Tévét 11' format", () => {
      const result = parseHebrewDateString("Tévét 11");
      expect(result).toEqual({ day: 11, month: 10 });
    });

    it("should parse 'Kiszlév 10' format", () => {
      const result = parseHebrewDateString("Kiszlév 10");
      expect(result).toEqual({ day: 10, month: 9 });
    });

    it("should parse 'Áv 28' format", () => {
      const result = parseHebrewDateString("Áv 28");
      expect(result).toEqual({ day: 28, month: 5 });
    });

    it("should parse 'Iyyar' variant (English format)", () => {
      const result = parseHebrewDateString("24 Iyyar");
      expect(result).toEqual({ day: 24, month: 2 });
    });

    it("should parse 'Iyyar' variant (Hungarian format)", () => {
      const result = parseHebrewDateString("Iyyar 24");
      expect(result).toEqual({ day: 24, month: 2 });
    });

    it("should parse 'Iyar' variant (English format)", () => {
      const result = parseHebrewDateString("24 Iyar");
      expect(result).toEqual({ day: 24, month: 2 });
    });

    it("should parse 'Iyar' variant (Hungarian format)", () => {
      const result = parseHebrewDateString("Iyar 24");
      expect(result).toEqual({ day: 24, month: 2 });
    });

    it("should parse 'Tisri' variant (Hungarian: Tisri 7)", () => {
      const result = parseHebrewDateString("Tisri 7");
      expect(result).toEqual({ day: 7, month: 7 });
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

    it("should reject invalid day number in Hungarian format", () => {
      const result = parseHebrewDateString("Tishrei 32");
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
