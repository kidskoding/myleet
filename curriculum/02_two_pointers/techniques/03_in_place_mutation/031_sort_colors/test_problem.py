from solution import sort_colors


def test_sort_colors_empty():
    nums: list[int] = []
    sort_colors(nums)
    assert nums == []


def test_sort_colors_single():
    nums = [1]
    sort_colors(nums)
    assert nums == [1]


def test_sort_colors_normal():
    nums = [2, 0, 2, 1, 1, 0]
    sort_colors(nums)
    assert nums == [0, 0, 1, 1, 2, 2]


def test_sort_colors_already_sorted():
    nums = [0, 1, 2]
    sort_colors(nums)
    assert nums == [0, 1, 2]
