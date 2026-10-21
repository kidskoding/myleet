from solution import kth_smallest_product


def test_kth_smallest_product_example_one():
    assert kth_smallest_product([2, 5], [3, 4], 2) == 8


def test_kth_smallest_product_example_two():
    assert kth_smallest_product([-4, -2, 0, 3], [2, 4], 6) == 0


def test_kth_smallest_product_example_three():
    assert kth_smallest_product([-2, -1, 0, 1, 2], [-3, -1, 2, 4, 5], 3) == -6


def test_kth_smallest_product_smallest():
    assert kth_smallest_product([1, 2], [3], 1) == 3
