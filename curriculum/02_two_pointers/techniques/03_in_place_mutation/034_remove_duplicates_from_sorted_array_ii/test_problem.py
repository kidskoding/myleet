from solution import remove_duplicates_ii


def test_remove_duplicates_ii_keeps_at_most_two():
    nums = [1, 1, 1, 2, 2, 3]
    k = remove_duplicates_ii(nums)

    assert k == 5
    assert nums[:k] == [1, 1, 2, 2, 3]


def test_remove_duplicates_ii_longer():
    nums = [0, 0, 1, 1, 1, 1, 2, 3, 3]
    k = remove_duplicates_ii(nums)

    assert k == 7
    assert nums[:k] == [0, 0, 1, 1, 2, 3, 3]


def test_remove_duplicates_ii_single_element():
    nums = [1]
    k = remove_duplicates_ii(nums)

    assert k == 1
    assert nums[:k] == [1]
