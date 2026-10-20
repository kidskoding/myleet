from list_node import ListNode
from solution import merge_two_lists


def build_list(values: list[int]) -> ListNode | None:
    dummy = ListNode()
    curr = dummy
    for value in values:
        curr.next = ListNode(value)
        curr = curr.next
    return dummy.next


def to_list(head: ListNode | None) -> list[int]:
    values = []
    while head:
        values.append(head.val)
        head = head.next
    return values


def test_merge_two_lists_both_empty():
    assert merge_two_lists(None, None) is None


def test_merge_two_lists_one_empty():
    assert to_list(merge_two_lists(build_list([1, 3, 5]), None)) == [1, 3, 5]


def test_merge_two_lists_interleaved():
    merged = merge_two_lists(build_list([1, 2, 4]), build_list([1, 3, 4]))
    assert to_list(merged) == [1, 1, 2, 3, 4, 4]
