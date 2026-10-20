from solution import max_number_of_apples


def test_max_number_of_apples_all_fit():
    assert max_number_of_apples([100, 200, 150, 1000]) == 4


def test_max_number_of_apples_drop_heaviest():
    assert max_number_of_apples([900, 950, 800, 1000, 700, 800]) == 5


def test_max_number_of_apples_single():
    assert max_number_of_apples([1000]) == 1


def test_max_number_of_apples_exact_capacity():
    assert max_number_of_apples([1000] * 5) == 5


def test_max_number_of_apples_many_heavy():
    assert max_number_of_apples([1000] * 7) == 5


def test_max_number_of_apples_light_ones_first():
    assert max_number_of_apples([999, 1, 1000, 2, 1000, 1000, 1000, 3]) == 7
