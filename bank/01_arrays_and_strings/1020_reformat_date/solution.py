MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def reformat_date(date: str) -> str:
    day, month, year = date.split()
    return f"{year}-{MONTHS.index(month) + 1:02d}-{int(day[:-2]):02d}"
