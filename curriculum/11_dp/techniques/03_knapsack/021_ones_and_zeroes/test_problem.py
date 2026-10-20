from solution import find_max_form


def test_find_max_form_normal():
    assert find_max_form(["10", "0001", "111001", "1", "0"], 5, 3) == 4


def test_find_max_form_tight_budget():
    assert find_max_form(["10", "0", "1"], 1, 1) == 2
