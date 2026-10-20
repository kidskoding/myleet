from solution import average_value


def test_average_value_example():
    assert average_value([1, 3, 6, 10, 12, 15]) == 9


def test_average_value_none_qualify():
    assert average_value([1, 2, 4, 7, 10]) == 0


def test_average_value_single():
    assert average_value([6]) == 6


def test_average_value_rounds_down():
    assert average_value([6, 12, 18, 6]) == 10


def test_average_value_odd_multiple_of_three_ignored():
    assert average_value([3, 9, 12]) == 12
