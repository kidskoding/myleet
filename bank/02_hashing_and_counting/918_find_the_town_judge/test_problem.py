from solution import find_judge


def test_find_judge_two_people():
    assert find_judge(2, [[1, 2]]) == 2


def test_find_judge_three_people():
    assert find_judge(3, [[1, 3], [2, 3]]) == 3


def test_find_judge_candidate_trusts_someone():
    assert find_judge(3, [[1, 3], [2, 3], [3, 1]]) == -1


def test_find_judge_single_person_is_judge():
    assert find_judge(1, []) == 1


def test_find_judge_not_trusted_by_everyone():
    assert find_judge(3, [[1, 2], [2, 3]]) == -1


def test_find_judge_extra_trust_between_others():
    assert find_judge(4, [[1, 3], [2, 3], [4, 3], [1, 2], [4, 1]]) == 3
