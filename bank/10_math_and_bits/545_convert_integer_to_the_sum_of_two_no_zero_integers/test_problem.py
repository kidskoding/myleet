from solution import get_no_zero_integers


def assert_valid(n: int, pair: list[int]) -> None:
    a, b = pair
    assert a > 0 and b > 0 and a + b == n
    assert "0" not in str(a) and "0" not in str(b)


def test_get_no_zero_integers_two():
    assert_valid(2, get_no_zero_integers(2))


def test_get_no_zero_integers_eleven():
    assert_valid(11, get_no_zero_integers(11))


def test_get_no_zero_integers_example():
    assert_valid(139, get_no_zero_integers(139))


def test_get_no_zero_integers_power_of_ten():
    assert_valid(1000, get_no_zero_integers(1000))


def test_get_no_zero_integers_many_zeros():
    assert_valid(1010, get_no_zero_integers(1010))


def test_get_no_zero_integers_upper_bound():
    assert_valid(10**4, get_no_zero_integers(10**4))
