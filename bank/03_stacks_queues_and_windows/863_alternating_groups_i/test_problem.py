from solution import number_of_alternating_groups


def test_number_of_alternating_groups_all_same():
    assert number_of_alternating_groups([1, 1, 1]) == 0


def test_number_of_alternating_groups_example():
    assert number_of_alternating_groups([0, 1, 0, 0, 1]) == 3


def test_number_of_alternating_groups_fully_alternating_circle():
    assert number_of_alternating_groups([0, 1, 0, 1]) == 4


def test_number_of_alternating_groups_odd_circle_breaks_at_wrap():
    assert number_of_alternating_groups([0, 1, 0]) == 1


def test_number_of_alternating_groups_wrap_around_group():
    assert number_of_alternating_groups([1, 1, 0, 0, 1, 0]) == 2
