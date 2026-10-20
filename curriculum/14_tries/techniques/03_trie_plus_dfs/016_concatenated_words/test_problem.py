from solution import find_all_concatenated_words


def test_find_all_concatenated_words_normal():
    words = [
        "cat",
        "cats",
        "catsdogcats",
        "dog",
        "dogcatsdog",
        "hippopotamuses",
        "rat",
        "ratcatdogcat",
    ]
    result = find_all_concatenated_words(words)
    assert set(result) == {"catsdogcats", "dogcatsdog", "ratcatdogcat"}


def test_find_all_concatenated_words_no_matches():
    assert find_all_concatenated_words(["cat", "dog", "bird"]) == []


def test_find_all_concatenated_words_empty_input():
    assert find_all_concatenated_words([]) == []
