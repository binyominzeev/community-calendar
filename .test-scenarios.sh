#!/bin/bash
# Manual test scenario for birthday import feature

echo "================================"
echo "Birth Date Import - Test Scenarios"
echo "================================"
echo ""

echo "Scenario 1: Gregorian date import"
echo "INPUT:"
cat << 'JSON'
{
  "rows": [
    {
      "displayName": "John Smith",
      "eventType": "Birthday",
      "civilDate": "1980-05-15"
    }
  ]
}
JSON
echo ""
echo "EXPECTED: Person created, event created with Hebrew date conversion"
echo ""

echo "Scenario 2: Hebrew date import"
echo "INPUT:"
cat << 'JSON'
{
  "rows": [
    {
      "displayName": "David Cohen",
      "eventType": "Birthday",
      "hebrewDate": "24 Iyyar"
    }
  ]
}
JSON
echo ""
echo "EXPECTED: Person created, event created with Hebrew date"
echo ""

echo "Scenario 3: Both dates provided (Gregorian prioritized)"
echo "INPUT:"
cat << 'JSON'
{
  "rows": [
    {
      "displayName": "Sarah Levi",
      "eventType": "Birthday",
      "civilDate": "1990-12-25",
      "hebrewDate": "7 Tishrei"
    }
  ]
}
JSON
echo ""
echo "EXPECTED: Person created, event created using Gregorian date (prioritized)"
echo ""

echo "Scenario 4: Duplicate detection"
echo "STEP 1 - Import original:"
cat << 'JSON'
{
  "rows": [
    {
      "displayName": "Michael Brown",
      "eventType": "Birthday",
      "civilDate": "1975-03-10"
    }
  ]
}
JSON
echo ""
echo "STEP 2 - Import same person with same date again:"
cat << 'JSON'
{
  "rows": [
    {
      "displayName": "Michael Brown",
      "eventType": "Birthday",
      "hebrewDate": "24 Adar II"
    }
  ]
}
JSON
echo ""
echo "EXPECTED: status 'skipped' for the duplicate"
echo ""

echo "Scenario 5: Invalid Gregorian date"
echo "INPUT:"
cat << 'JSON'
{
  "rows": [
    {
      "displayName": "Jane Doe",
      "eventType": "Birthday",
      "civilDate": "2000-13-45"
    }
  ]
}
JSON
echo ""
echo "EXPECTED: status 'partial' - person created, event not created due to invalid date"
echo ""

echo "Scenario 6: No date provided"
echo "INPUT:"
cat << 'JSON'
{
  "rows": [
    {
      "displayName": "Bob Wilson",
      "eventType": "Birthday"
    }
  ]
}
JSON
echo ""
echo "EXPECTED: status 'partial' - person created, event not created due to missing date"
echo ""

echo "✓ Test scenarios documented"
