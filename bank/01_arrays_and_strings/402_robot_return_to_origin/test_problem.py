from solution import judge_circle


def test_judge_circle_up_down():
    assert judge_circle("UD") is True


def test_judge_circle_two_lefts():
    assert judge_circle("LL") is False


def test_judge_circle_empty():
    assert judge_circle("") is True


def test_judge_circle_square_loop():
    assert judge_circle("URDL") is True


def test_judge_circle_unbalanced_vertical():
    assert judge_circle("RLUURDDDLU") is True
    assert judge_circle("RRDDLU") is False
