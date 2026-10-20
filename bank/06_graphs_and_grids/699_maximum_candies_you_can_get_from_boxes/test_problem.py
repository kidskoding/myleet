from solution import max_candies


def test_max_candies_example_one():
    assert max_candies([1, 0, 1, 0], [7, 5, 4, 100], [[], [], [1], []], [[1, 2], [3], [], []], [0]) == 16


def test_max_candies_first_box_holds_everything():
    status = [1, 0, 0, 0, 0, 0]
    keys = [[1, 2, 3, 4, 5], [], [], [], [], []]
    contained = [[1, 2, 3, 4, 5], [], [], [], [], []]
    assert max_candies(status, [1, 1, 1, 1, 1, 1], keys, contained, [0]) == 6


def test_max_candies_no_initial_boxes():
    assert max_candies([1], [5], [[]], [[]], []) == 0


def test_max_candies_locked_without_key():
    assert max_candies([0], [5], [[]], [[]], [0]) == 0


def test_max_candies_key_arrives_for_box_already_held():
    assert max_candies([0, 1], [10, 1], [[], [0]], [[], []], [0, 1]) == 11
