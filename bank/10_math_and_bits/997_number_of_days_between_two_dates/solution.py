MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]


def _is_leap(year: int) -> bool:
    return year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)


def _days_since_epoch(date: str) -> int:
    year, month, day = map(int, date.split("-"))
    total = sum(366 if _is_leap(y) else 365 for y in range(1900, year))
    total += sum(MONTH_DAYS[: month - 1])
    if month > 2 and _is_leap(year):
        total += 1
    return total + day


def days_between_dates(date1: str, date2: str) -> int:
    return abs(_days_since_epoch(date1) - _days_since_epoch(date2))
