from solution import color_the_array


def test_color_the_array_mixed_updates():
    assert color_the_array(4, [[0, 2], [1, 2], [3, 1], [1, 1], [2, 1]]) == [0, 1, 1, 0, 2]


def test_color_the_array_single_cell():
    assert color_the_array(1, [[0, 100000]]) == [0]


def test_color_the_array_same_color_twice():
    assert color_the_array(2, [[0, 3], [1, 3], [1, 3]]) == [0, 1, 1]


def test_color_the_array_bridge_two_pairs():
    assert color_the_array(3, [[0, 5], [2, 5], [1, 5], [1, 4]]) == [0, 0, 2, 0]


def test_color_the_array_recolor_breaks_pair():
    assert color_the_array(2, [[0, 1], [1, 1], [0, 2]]) == [0, 1, 0]
