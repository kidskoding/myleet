from solution import best_closing_time


def test_best_closing_time_mixed():
    assert best_closing_time("YYNY") == 2


def test_best_closing_time_no_customers():
    assert best_closing_time("NNNNN") == 0


def test_best_closing_time_always_customers():
    assert best_closing_time("YYYY") == 4


def test_best_closing_time_single_n():
    assert best_closing_time("N") == 0


def test_best_closing_time_single_y():
    assert best_closing_time("Y") == 1


def test_best_closing_time_tie_takes_earliest():
    assert best_closing_time("YNYN") == 1
