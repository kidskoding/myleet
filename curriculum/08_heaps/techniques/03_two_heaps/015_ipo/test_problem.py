from solution import find_maximized_capital


def test_find_maximized_capital_normal():
    assert find_maximized_capital(2, 0, [1, 2, 3], [0, 1, 1]) == 4


def test_find_maximized_capital_no_affordable_project():
    assert find_maximized_capital(1, 0, [5], [1]) == 0


def test_find_maximized_capital_single_project():
    assert find_maximized_capital(1, 0, [1], [0]) == 1
