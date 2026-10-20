from solution import max_boxes_in_warehouse


def test_max_boxes_in_warehouse_example_one():
    assert max_boxes_in_warehouse([1, 2, 2, 3, 4], [3, 4, 1, 2]) == 4


def test_max_boxes_in_warehouse_example_two():
    assert max_boxes_in_warehouse([3, 5, 5, 2], [2, 1, 3, 4, 5]) == 3


def test_max_boxes_in_warehouse_nothing_fits():
    assert max_boxes_in_warehouse([5], [4, 4]) == 0


def test_max_boxes_in_warehouse_single_room():
    assert max_boxes_in_warehouse([2, 1], [2]) == 1


def test_max_boxes_in_warehouse_tall_middle_unreachable():
    assert max_boxes_in_warehouse([5, 1, 1], [1, 5, 1]) == 2
