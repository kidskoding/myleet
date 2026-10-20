from solution import maximum_total_damage


def test_maximum_total_damage_example_one():
    assert maximum_total_damage([1, 1, 3, 4]) == 6


def test_maximum_total_damage_example_two():
    assert maximum_total_damage([7, 1, 6, 6]) == 13


def test_maximum_total_damage_single():
    assert maximum_total_damage([5]) == 5


def test_maximum_total_damage_all_duplicates():
    assert maximum_total_damage([3, 3, 3]) == 9


def test_maximum_total_damage_consecutive_run():
    assert maximum_total_damage([1, 2, 3, 4, 5, 6]) == 9


def test_maximum_total_damage_large_values():
    assert maximum_total_damage([10**9, 1, 10**9]) == 2 * 10**9 + 1
