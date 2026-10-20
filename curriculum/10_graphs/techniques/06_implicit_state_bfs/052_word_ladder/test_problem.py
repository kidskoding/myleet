from solution import ladder_length


def test_ladder_length_normal_case():
    assert ladder_length("hit", "cog", ["hot", "dot", "dog", "lot", "log", "cog"]) == 5


def test_ladder_length_no_path():
    assert ladder_length("hit", "cog", ["hot", "dot", "dog", "lot", "log"]) == 0
