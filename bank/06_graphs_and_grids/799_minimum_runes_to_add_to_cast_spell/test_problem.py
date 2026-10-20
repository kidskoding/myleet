from solution import min_runes_to_add


def test_min_runes_to_add_isolated_nodes():
    assert min_runes_to_add(6, [0], [0, 1, 2, 3], [1, 2, 3, 0]) == 2


def test_min_runes_to_add_unreached_cycle():
    assert min_runes_to_add(7, [3, 5], [0, 1, 2, 3, 5], [1, 2, 0, 4, 6]) == 1


def test_min_runes_to_add_everything_reached():
    assert min_runes_to_add(3, [0], [0, 1], [1, 2]) == 0


def test_min_runes_to_add_unreached_chain():
    assert min_runes_to_add(4, [0], [1, 2], [2, 3]) == 1


def test_min_runes_to_add_two_cycles_feeding_one():
    assert min_runes_to_add(6, [5], [0, 1, 2, 3, 1, 3], [1, 0, 3, 2, 4, 4]) == 2


def test_min_runes_to_add_every_node_is_crystal():
    assert min_runes_to_add(2, [0, 1], [0], [1]) == 0
