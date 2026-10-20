from list_node import ListNode
from solution import reverse_list


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


def test_reverse_list_empty():
    assert reverse_list(None) is None


def test_reverse_list_single():
    assert to_list(reverse_list(build_list([1]))) == [1]


def test_reverse_list_multiple():
    assert to_list(reverse_list(build_list([1, 2, 3, 4, 5]))) == [5, 4, 3, 2, 1]
