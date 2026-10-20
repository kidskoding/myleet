from solution import find_ladders


def test_find_ladders_normal_case():
    word_list = ["hot", "dot", "dog", "lot", "log", "cog"]

    result = find_ladders("hit", "cog", word_list)

    assert sorted(tuple(path) for path in result) == sorted(
        tuple(path)
        for path in [
            ["hit", "hot", "dot", "dog", "cog"],
            ["hit", "hot", "lot", "log", "cog"],
        ]
    )


def test_find_ladders_no_path():
    assert find_ladders("hit", "cog", ["hot", "dot", "dog", "lot", "log"]) == []
