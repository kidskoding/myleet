from solution import judge_point24


def test_judge_point24_reachable():
    assert judge_point24([4, 1, 8, 7]) is True


def test_judge_point24_unreachable():
    assert judge_point24([1, 2, 1, 2]) is False
