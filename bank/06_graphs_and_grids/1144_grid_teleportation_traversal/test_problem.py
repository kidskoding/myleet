from solution import min_moves


def test_min_moves_teleport_before_first_move():
    assert min_moves(["A..", ".A.", "..."]) == 2


def test_min_moves_winding_path_without_portals():
    assert min_moves([".#...", ".#.#.", ".#.#.", "...#."]) == 13


def test_min_moves_single_cell():
    assert min_moves(["."]) == 0


def test_min_moves_unreachable():
    assert min_moves([".#", "#."]) == -1


def test_min_moves_teleport_onto_target():
    assert min_moves(["A#", "#A"]) == 0


def test_min_moves_chain_of_two_portals():
    assert min_moves(["A#A.B", "#####", "B...."]) == 6
