from solution import binary_searchable_numbers


def test_binary_searchable_numbers_single():
    assert binary_searchable_numbers([7]) == 1


def test_binary_searchable_numbers_example():
    assert binary_searchable_numbers([-1, 5, 2]) == 1


def test_binary_searchable_numbers_sorted():
    assert binary_searchable_numbers([1, 2, 3]) == 3


def test_binary_searchable_numbers_reversed():
    assert binary_searchable_numbers([3, 2, 1]) == 0


def test_binary_searchable_numbers_mixed():
    assert binary_searchable_numbers([2, 1, 3, 5, 4, 6]) == 2
