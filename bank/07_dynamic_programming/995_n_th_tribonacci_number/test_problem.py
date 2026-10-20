from solution import tribonacci


def test_tribonacci_base_cases():
    assert tribonacci(0) == 0
    assert tribonacci(1) == 1
    assert tribonacci(2) == 1


def test_tribonacci_four():
    assert tribonacci(4) == 4


def test_tribonacci_twenty_five():
    assert tribonacci(25) == 1389537


def test_tribonacci_upper_limit():
    assert tribonacci(37) == 2082876103
