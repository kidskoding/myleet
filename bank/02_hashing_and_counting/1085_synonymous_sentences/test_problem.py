from solution import generate_sentences

TEXT = "I am happy today but was sad yesterday"


def test_generate_sentences_two_groups():
    synonyms = [["happy", "joy"], ["sad", "sorrow"], ["joy", "cheerful"]]
    assert generate_sentences(synonyms, TEXT) == [
        "I am cheerful today but was sad yesterday",
        "I am cheerful today but was sorrow yesterday",
        "I am happy today but was sad yesterday",
        "I am happy today but was sorrow yesterday",
        "I am joy today but was sad yesterday",
        "I am joy today but was sorrow yesterday",
    ]


def test_generate_sentences_unused_group():
    synonyms = [["happy", "joy"], ["cheerful", "glad"]]
    assert generate_sentences(synonyms, TEXT) == [
        "I am happy today but was sad yesterday",
        "I am joy today but was sad yesterday",
    ]


def test_generate_sentences_no_synonyms():
    assert generate_sentences([], "hello world") == ["hello world"]


def test_generate_sentences_single_word():
    assert generate_sentences([["a", "b"], ["b", "c"]], "b") == ["a", "b", "c"]


def test_generate_sentences_repeated_word():
    assert generate_sentences([["x", "y"]], "x x") == ["x x", "x y", "y x", "y y"]
