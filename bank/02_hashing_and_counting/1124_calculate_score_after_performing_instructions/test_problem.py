from solution import calculate_score


def test_calculate_score_stops_on_revisit():
    instructions = ["jump", "add", "add", "jump", "add", "jump"]
    assert calculate_score(instructions, [2, 1, 3, 1, -2, -3]) == 1


def test_calculate_score_jumps_out_of_bounds():
    assert calculate_score(["jump", "add", "add"], [3, 1, 1]) == 0


def test_calculate_score_self_jump():
    assert calculate_score(["jump"], [0]) == 0


def test_calculate_score_runs_off_the_end():
    assert calculate_score(["add", "add"], [5, -2]) == 3


def test_calculate_score_jumps_before_start():
    assert calculate_score(["add", "jump"], [4, -5]) == 4


def test_calculate_score_revisits_an_add():
    assert calculate_score(["add", "jump"], [1, -1]) == 1
