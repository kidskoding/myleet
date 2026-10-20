from solution import num_squareful_perms


def test_num_squareful_perms_example():
    assert num_squareful_perms([1, 17, 8]) == 2


def test_num_squareful_perms_all_equal():
    assert num_squareful_perms([2, 2, 2]) == 1


def test_num_squareful_perms_single():
    assert num_squareful_perms([1]) == 1


def test_num_squareful_perms_none():
    assert num_squareful_perms([1, 1]) == 0


def test_num_squareful_perms_zeros():
    assert num_squareful_perms([0, 0]) == 1


def test_num_squareful_perms_duplicates_counted_once():
    assert num_squareful_perms([1, 8, 8]) == 3
