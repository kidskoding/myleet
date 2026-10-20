from solution import sum_zero


def assert_valid(n: int, result: list[int]) -> None:
    assert len(result) == n
    assert len(set(result)) == n
    assert sum(result) == 0


def test_sum_zero_odd():
    assert_valid(5, sum_zero(5))


def test_sum_zero_three():
    assert_valid(3, sum_zero(3))


def test_sum_zero_one():
    assert sum_zero(1) == [0]


def test_sum_zero_even():
    assert_valid(4, sum_zero(4))


def test_sum_zero_large():
    assert_valid(1000, sum_zero(1000))
