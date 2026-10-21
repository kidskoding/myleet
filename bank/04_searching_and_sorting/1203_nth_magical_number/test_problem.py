from solution import nth_magical_number


def test_nth_magical_number_first():
    assert nth_magical_number(1, 2, 3) == 2


def test_nth_magical_number_four():
    assert nth_magical_number(4, 2, 3) == 6


def test_nth_magical_number_shared_factors():
    assert nth_magical_number(5, 2, 4) == 10


def test_nth_magical_number_equal():
    assert nth_magical_number(3, 6, 6) == 18


def test_nth_magical_number_larger():
    assert nth_magical_number(1000000000, 40000, 40000) == 999720007
