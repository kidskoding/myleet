from solution import wiggle_sort


def test_wiggle_sort_alternates():
    nums = [1, 5, 1, 1, 6, 4]
    wiggle_sort(nums)

    assert sorted(nums) == [1, 1, 1, 4, 5, 6]
    assert all(nums[i] < nums[i + 1] if i % 2 == 0 else nums[i] > nums[i + 1] for i in range(len(nums) - 1))


def test_wiggle_sort_odd_length():
    nums = [1, 5, 1, 1, 6, 4, 3]
    wiggle_sort(nums)

    assert sorted(nums) == [1, 1, 1, 3, 4, 5, 6]
    assert all(nums[i] < nums[i + 1] if i % 2 == 0 else nums[i] > nums[i + 1] for i in range(len(nums) - 1))


def test_wiggle_sort_two_elements():
    nums = [2, 1]
    wiggle_sort(nums)

    assert nums == [1, 2]


def test_wiggle_sort_single_element():
    nums = [7]
    wiggle_sort(nums)

    assert nums == [7]
