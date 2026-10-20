from solution import rank_teams


def test_rank_teams_example():
    assert rank_teams(["ABC", "ACB", "ABC", "ACB", "ACB"]) == "ACB"


def test_rank_teams_tie_broken_by_second_place():
    assert rank_teams(["WXYZ", "XYZW"]) == "XWYZ"


def test_rank_teams_single_vote():
    assert rank_teams(["ZMNAGUEDSJYLBOPHRQICWFXTVK"]) == "ZMNAGUEDSJYLBOPHRQICWFXTVK"


def test_rank_teams_full_tie_alphabetical():
    assert rank_teams(["BCA", "CAB", "CBA", "ABC", "ACB", "BAC"]) == "ABC"


def test_rank_teams_one_team():
    assert rank_teams(["M", "M", "M", "M"]) == "M"
