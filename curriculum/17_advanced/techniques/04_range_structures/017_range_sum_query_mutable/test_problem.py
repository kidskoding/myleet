from solution import FenwickTree, NumArray


def test_num_array_sum_range():
    num_array = NumArray([1, 3, 5])
    assert num_array.sum_range(0, 2) == 9


def test_num_array_update_then_sum():
    num_array = NumArray([1, 3, 5])
    num_array.update(1, 2)
    assert num_array.sum_range(0, 2) == 8


def test_num_array_single_element():
    num_array = NumArray([7])
    assert num_array.sum_range(0, 0) == 7


def test_fenwick_tree_prefix_and_range_sums():
    tree = FenwickTree(5)
    tree.update(0, 1)
    tree.update(2, 3)

    assert tree.prefix_sum(2) == 4
    assert tree.range_sum(1, 2) == 3
    assert tree.range_sum(0, 4) == 4


def test_fenwick_tree_starts_empty():
    tree = FenwickTree(3)

    assert tree.prefix_sum(2) == 0
