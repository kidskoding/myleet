from solution import remove_duplicates


def test_remove_duplicates_empty():
    nums: list[int] = []
    assert remove_duplicates(nums) == 0


def test_remove_duplicates_single():
    nums = [1]
    k = remove_duplicates(nums)
    assert k == 1
    assert nums[:k] == [1]


def test_remove_duplicates_no_dupes():
    nums = [1, 2, 3]
    k = remove_duplicates(nums)
    assert k == 3
    assert nums[:k] == [1, 2, 3]


def test_remove_duplicates_with_dupes():
    nums = [0, 0, 1, 1, 1, 2, 2, 3, 3, 4]
    k = remove_duplicates(nums)
    assert k == 5
    assert nums[:k] == [0, 1, 2, 3, 4]
