from solution import fib


def test_fib_two():
    assert fib(2) == 1


def test_fib_three():
    assert fib(3) == 2


def test_fib_four():
    assert fib(4) == 3


def test_fib_base_cases():
    assert fib(0) == 0
    assert fib(1) == 1


def test_fib_upper_limit():
    assert fib(30) == 832040
