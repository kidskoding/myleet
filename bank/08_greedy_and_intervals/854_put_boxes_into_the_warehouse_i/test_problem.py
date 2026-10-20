from solution import max_boxes_in_warehouse


def test_max_boxes_in_warehouse_example_one():
    assert max_boxes_in_warehouse([4, 3, 4, 1], [5, 3, 3, 4, 1]) == 3


def test_max_boxes_in_warehouse_example_two():
    assert max_boxes_in_warehouse([1, 2, 2, 3, 4], [3, 4, 1, 2]) == 3


def test_max_boxes_in_warehouse_example_three():
    assert max_boxes_in_warehouse([1, 2, 3], [1, 2, 3, 4]) == 1


def test_max_boxes_in_warehouse_nothing_fits():
    assert max_boxes_in_warehouse([5, 6], [4, 4, 4]) == 0


def test_max_boxes_in_warehouse_more_boxes_than_rooms():
    assert max_boxes_in_warehouse([1, 1, 1, 1], [2, 2]) == 2
