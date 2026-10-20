from solution import find_maximized_capital


def test_find_maximized_capital_two_projects():
    assert find_maximized_capital(2, 0, [1, 2, 3], [0, 1, 1]) == 4


def test_find_maximized_capital_three_projects():
    assert find_maximized_capital(3, 0, [1, 2, 3], [0, 1, 2]) == 6
