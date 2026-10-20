from solution import minimum_operations


def test_minimum_operations_two_merges():
    assert minimum_operations([4, 3, 2, 1, 2, 3, 1]) == 2


def test_minimum_operations_merge_everything():
    assert minimum_operations([1, 2, 3, 4]) == 3


def test_minimum_operations_already_palindrome():
    assert minimum_operations([1, 2, 1]) == 0


def test_minimum_operations_single():
    assert minimum_operations([5]) == 0


def test_minimum_operations_merge_left_once():
    assert minimum_operations([1, 1, 2]) == 1
