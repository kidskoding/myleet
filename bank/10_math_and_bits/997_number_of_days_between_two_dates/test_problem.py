from solution import days_between_dates


def test_days_between_dates_adjacent_days():
    assert days_between_dates("2019-06-29", "2019-06-30") == 1


def test_days_between_dates_reversed_order():
    assert days_between_dates("2020-01-15", "2019-12-31") == 15


def test_days_between_dates_same_date():
    assert days_between_dates("2000-05-05", "2000-05-05") == 0


def test_days_between_dates_leap_february():
    assert days_between_dates("2020-02-28", "2020-03-01") == 2


def test_days_between_dates_century_not_leap():
    assert days_between_dates("2100-02-28", "2100-03-01") == 1


def test_days_between_dates_full_range():
    assert days_between_dates("1971-01-01", "2100-12-31") == 47481
